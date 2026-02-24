import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
    constructor(private readonly appService: AppService) { }

    @Post('ingest')
    async ingest(@Body('filePath') filePath: string) {
        if (!filePath) {
            return { success: false, error: 'filePath is required' };
        }
        await this.appService.ingestFile(filePath);
        return { success: true, message: `Pipeline ran successfully on ${filePath}` };
    }

    @Get('status')
    getStatus() {
        return this.appService.getStatus();
    }

    @Post('switch/:preset')
    switchPreset(@Param('preset') preset: string) {
        // Dynamic runtime switch MVP 
        return this.appService.switchPreset(preset);
    }
}
