import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpsertFinancialYearDto } from './dto/financial-year.dto';
import { FinancialYearsService } from './financial-years.service';

@Controller('profiles/:profileId/financial-years')
@UseGuards(JwtAuthGuard)
export class FinancialYearsController {
  constructor(private readonly service: FinancialYearsService) {}

  /** Crée l'exercice ou une nouvelle version s'il existe déjà. */
  @Put()
  upsert(
    @CurrentUser() user: AuthenticatedUser,
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Body() dto: UpsertFinancialYearDto,
  ) {
    return this.service.upsert(user.userId, profileId, dto);
  }

  @Get()
  findCurrent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('profileId', ParseUUIDPipe) profileId: string,
  ) {
    return this.service.findCurrent(user.userId, profileId);
  }

  @Get(':fiscalYear/history')
  history(
    @CurrentUser() user: AuthenticatedUser,
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Param('fiscalYear', ParseIntPipe) fiscalYear: number,
  ) {
    return this.service.history(user.userId, profileId, fiscalYear);
  }
}
