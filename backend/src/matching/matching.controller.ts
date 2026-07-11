import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MatchingService } from './matching.service';

@Controller('tenders/:tenderId/matching')
@UseGuards(JwtAuthGuard)
export class MatchingController {
  constructor(private readonly service: MatchingService) {}

  /** Lance le matching profil ↔ exigences (spec 6). */
  @Post()
  run(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
  ) {
    return this.service.run(user.userId, tenderId);
  }

  @Get()
  latest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
  ) {
    return this.service.latest(user.userId, tenderId);
  }

  @Get('history')
  history(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
  ) {
    return this.service.history(user.userId, tenderId);
  }

  @Get(':reportId')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
  ) {
    return this.service.findOne(user.userId, tenderId, reportId);
  }
}
