import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
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
  me(@CurrentUser() user: any) {
    console.log('--- [CONTROLLER] Pobrany obiekt user z dekoratora ---', user);
    
    // Wyciągamy ID ze struktury, którą zwraca JwtStrategy
    const userId = user?.userId;
    
    console.log(`--- [CONTROLLER] Przekazuję userId: "${userId}" do AuthService ---`);
    return this.authService.getProfile(userId);
  }
}