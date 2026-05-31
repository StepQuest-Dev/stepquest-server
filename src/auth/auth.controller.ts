import { Controller, Post, Body, UseGuards, Get, Patch, Delete } from '@nestjs/common'; // <-- DODANO 'Delete'
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser('userId') userId: string) {
    return this.authService.getProfile(userId);
  }

  // --- NOWY ENDPOINT DO AKTUALIZACJI PROFILU ---
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateProfile(
    @CurrentUser('userId') userId: string, 
    @Body() body: { username?: string; avatarUrl?: string | null }
  ) {
    return this.authService.updateProfile(userId, body);
  }

  // --- NOWY ENDPOINT DO USUWANIA KONTA ---
  @UseGuards(JwtAuthGuard)
  @Delete('me')
  deleteAccount(@CurrentUser('userId') userId: string) {
    return this.authService.deleteAccount(userId);
  }
}