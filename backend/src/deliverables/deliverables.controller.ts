import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DeliverablesService } from './deliverables.service';
import {
  GenerateCommercialDto,
  GenerateTechnicalDto,
  UpdateDeliverableDto,
} from './dto/deliverable.dto';

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

  /** Génère la proposition technique (spec 7.2) — écarts signalés avant. */
  @Post('technical')
  generateTechnical(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
    @Body() dto: GenerateTechnicalDto,
  ) {
    return this.service.generateTechnical(
      user.userId,
      tenderId,
      dto.acknowledgeGaps ?? false,
    );
  }

  /** Génère la proposition commerciale (spec 7.3) depuis le bordereau importé. */
  @Post('commercial')
  generateCommercial(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
    @Body() dto: GenerateCommercialDto,
  ) {
    return this.service.generateCommercial(user.userId, tenderId, dto);
  }

  /** Relecture : correction du contenu structuré (spec 8). */
  @Patch(':deliverableId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
    @Param('deliverableId', ParseUUIDPipe) deliverableId: string,
    @Body() dto: UpdateDeliverableDto,
  ) {
    return this.service.update(
      user.userId,
      tenderId,
      deliverableId,
      dto.content,
    );
  }

  /** Marque le document comme relu et validé (spec 8). */
  @Post(':deliverableId/review')
  review(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
    @Param('deliverableId', ParseUUIDPipe) deliverableId: string,
  ) {
    return this.service.review(user.userId, tenderId, deliverableId);
  }

  /** Export Word (spec 8). */
  @Get(':deliverableId/docx')
  async exportDocx(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
    @Param('deliverableId', ParseUUIDPipe) deliverableId: string,
    @Res() res: Response,
  ) {
    const { filename, buffer, reviewed } = await this.service.exportDocx(
      user.userId,
      tenderId,
      deliverableId,
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    // Relecture recommandée avant diffusion (spec 8)
    res.setHeader('X-Relecture-Validee', reviewed ? 'oui' : 'non');
    res.send(buffer);
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
