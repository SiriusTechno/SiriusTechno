import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialYearsService } from './financial-years.service';
import { ProfilesService } from './profiles.service';

describe('FinancialYearsService — historique versionné (spec 4.1.B)', () => {
  let service: FinancialYearsService;

  const tx = {
    financialYear: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
  };
  const prismaMock = {
    $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const profilesMock = {
    assertOwnership: jest.fn().mockResolvedValue({ id: 'p1' }),
    touchSection: jest.fn(),
    logChange: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        FinancialYearsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ProfilesService, useValue: profilesMock },
      ],
    }).compile();
    service = moduleRef.get(FinancialYearsService);
  });

  it('crée la version 1 pour un exercice inédit, sans démarquer quoi que ce soit', async () => {
    tx.financialYear.findFirst.mockResolvedValue(null);
    tx.financialYear.create.mockImplementation(({ data }) =>
      Promise.resolve(data),
    );

    await service.upsert('u1', 'p1', { fiscalYear: 2024, revenue: 1000 });

    expect(tx.financialYear.updateMany).not.toHaveBeenCalled();
    expect(tx.financialYear.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ version: 1, isCurrent: true }),
      }),
    );
  });

  it("crée une nouvelle version et démarque l'ancienne pour un exercice existant", async () => {
    tx.financialYear.findFirst.mockResolvedValue({ version: 3 });
    tx.financialYear.create.mockImplementation(({ data }) =>
      Promise.resolve(data),
    );

    await service.upsert('u1', 'p1', { fiscalYear: 2024, revenue: 2000 });

    expect(tx.financialYear.updateMany).toHaveBeenCalledWith({
      where: { profileId: 'p1', fiscalYear: 2024, isCurrent: true },
      data: { isCurrent: false },
    });
    expect(tx.financialYear.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ version: 4, isCurrent: true }),
      }),
    );
  });

  it("refuse l'accès à un profil qui n'appartient pas à l'utilisateur", async () => {
    profilesMock.assertOwnership.mockRejectedValueOnce(new Error('forbidden'));
    await expect(
      service.upsert('intrus', 'p1', { fiscalYear: 2024, revenue: 1 }),
    ).rejects.toThrow('forbidden');
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
