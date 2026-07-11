import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DeliverablesService } from './deliverables.service';

@Controller('tenders/:tenderId/deliverables')
@UseGuards(JwtAuthGuard)
export class DeliverablesController {
  constructor(private readonly service: DeliverablesService) {}

  /** Génère le document d'analyse du profil (spec 7.1). */
  @Post('analysis')
  generateAnalysis(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
  ) {
    return this.service.generateAnalysis(user.userId, tenderId);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
  ) {
    return this.service.findAll(user.userId, tenderId);
  }

  @Get(':deliverableId')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
    @Param('deliverableId', ParseUUIDPipe) deliverableId: string,
  ) {
    return this.service.findOne(user.userId, tenderId, deliverableId);
  }

  /** Rendu Markdown brut, pratique pour la relecture (spec 8). */
  @Get(':deliverableId/markdown')
  @Header('Content-Type', 'text/markdown; charset=utf-8')
  async markdown(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
    @Param('deliverableId', ParseUUIDPipe) deliverableId: string,
  ) {
    const deliverable = await this.service.findOne(
      user.userId,
      tenderId,
      deliverableId,
    );
    return deliverable.markdown;
  }
}
