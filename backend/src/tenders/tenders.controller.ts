import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTenderDto } from './dto/create-tender.dto';
import { UpdateGridDto } from './dto/update-grid.dto';
import { TendersService } from './tenders.service';

@Controller('tenders')
@UseGuards(JwtAuthGuard)
export class TendersController {
  constructor(private readonly service: TendersService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTenderDto) {
    return this.service.create(user.userId, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('profileId') profileId?: string,
  ) {
    return this.service.findAll(user.userId, profileId);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(user.userId, id);
  }

  /** Relance l'extraction de texte (spec 5.1). */
  @Post(':id/extract')
  extract(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.extractText(user.userId, id);
  }

  /** Analyse LLM → grille de conformité (spec 5.2). */
  @Post(':id/analyze')
  analyze(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.analyze(user.userId, id);
  }

  /** Correction manuelle de la grille avant génération (auditable). */
  @Patch(':id/grid')
  updateGrid(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGridDto,
  ) {
    return this.service.updateGrid(user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(user.userId, id);
  }
}
