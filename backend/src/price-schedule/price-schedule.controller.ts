import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PriceScheduleService } from './price-schedule.service';

@Controller('tenders/:tenderId/price-schedule')
@UseGuards(JwtAuthGuard)
export class PriceScheduleController {
  constructor(private readonly service: PriceScheduleService) {}

  /** Template Excel du bordereau à remplir (spec 7.3). */
  @Get('template')
  async template(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.service.buildTemplate(
      user.userId,
      tenderId,
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  /** Import du bordereau rempli (multipart `file`, `?taxRate=0.18`). */
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  import(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('taxRate') taxRate?: string,
  ) {
    return this.service.import(
      user.userId,
      tenderId,
      file,
      taxRate !== undefined ? Number(taxRate) : undefined,
    );
  }

  @Get()
  current(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
  ) {
    return this.service.current(user.userId, tenderId);
  }

  @Get('history')
  history(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
  ) {
    return this.service.history(user.userId, tenderId);
  }
}
