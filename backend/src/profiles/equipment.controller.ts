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
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateEquipmentDto, UpdateEquipmentDto } from './dto/equipment.dto';
import { EquipmentService } from './equipment.service';

@Controller('profiles/:profileId/equipment')
@UseGuards(JwtAuthGuard)
export class EquipmentController {
  constructor(private readonly service: EquipmentService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Body() dto: CreateEquipmentDto,
  ) {
    return this.service.create(user.userId, profileId, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('profileId', ParseUUIDPipe) profileId: string,
  ) {
    return this.service.findAll(user.userId, profileId);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEquipmentDto,
  ) {
    return this.service.update(user.userId, profileId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(user.userId, profileId, id);
  }
}
