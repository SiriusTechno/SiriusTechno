import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ProfileSnapshot {
  profileId: string;
  legalName: string;
  isoCertifications: Array<Record<string, unknown>>;
  financialYears: Array<Record<string, unknown>>;
  projects: Array<Record<string, unknown>>;
  personnel: Array<Record<string, unknown>>;
  equipment: Array<Record<string, unknown>>;
  /** Ensemble des IDs référençables — sert à valider la sortie du LLM. */
  validElementIds: string[];
}

/**
 * Construit un instantané compact et identifié du profil : c'est la seule
 * matière que le moteur de matching a le droit d'utiliser (spec 6 — jamais
 * inventer une expérience ou une qualification absente du profil).
 */
@Injectable()
export class ProfileSnapshotService {
  constructor(private readonly prisma: PrismaService) {}

  async build(profileId: string): Promise<ProfileSnapshot> {
    const profile = await this.prisma.companyProfile.findUniqueOrThrow({
      where: { id: profileId },
      include: {
        isoCertifications: true,
        financialYears: { where: { isCurrent: true }, orderBy: { fiscalYear: 'desc' } },
        projects: true,
        personnel: { include: { diplomas: true, certifications: true } },
        equipment: true,
      },
    });

    const snapshot: ProfileSnapshot = {
      profileId: profile.id,
      legalName: profile.legalName,
      isoCertifications: profile.isoCertifications.map((c) => ({
        id: c.id,
        name: c.name,
        standard: c.standard,
        certifyingBody: c.certifyingBody,
        expiresAt: c.expiresAt,
      })),
      financialYears: profile.financialYears.map((f) => ({
        id: f.id,
        fiscalYear: f.fiscalYear,
        revenue: f.revenue.toString(),
        currency: f.currency,
        hasBalanceSheet: !!f.balanceSheetFileId,
        hasBankAttestation: !!f.bankAttestationFileId,
        hasTaxClearance: !!f.taxClearanceFileId,
      })),
      projects: profile.projects.map((p) => ({
        id: p.id,
        title: p.title,
        contractingAuthority: p.contractingAuthority,
        workType: p.workType,
        amount: p.amount?.toString() ?? null,
        currency: p.currency,
        startDate: p.startDate,
        endDate: p.endDate,
        description: p.description,
        hasFinalAcceptance: !!p.finalAcceptanceFileId,
        hasGoodExecutionCertificate: !!p.goodExecutionFileId,
      })),
      personnel: profile.personnel.map((m) => ({
        id: m.id,
        name: `${m.firstName} ${m.lastName}`,
        position: m.position,
        experienceSummary: m.experienceSummary,
        hasCv: !!m.cvFileId,
        diplomas: m.diplomas.map((d) => ({
          title: d.title,
          institution: d.institution,
          year: d.year,
        })),
        certifications: m.certifications.map((c) => ({
          name: c.name,
          issuingBody: c.issuingBody,
          expiresAt: c.expiresAt,
        })),
      })),
      equipment: profile.equipment.map((e) => ({
        id: e.id,
        type: e.type,
        ownershipStatus: e.ownershipStatus,
        brand: e.brand,
        model: e.model,
        capacity: e.capacity,
        acquisitionYear: e.acquisitionYear,
        hasOwnershipProof: !!e.ownershipProofFileId,
      })),
      validElementIds: [],
    };

    snapshot.validElementIds = [
      ...snapshot.isoCertifications,
      ...snapshot.financialYears,
      ...snapshot.projects,
      ...snapshot.personnel,
      ...snapshot.equipment,
    ].map((e) => e.id as string);

    return snapshot;
  }
}
