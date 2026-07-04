import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuthService, ParDeTokens } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto): Promise<ParDeTokens> {
    return this.authService.login(dto.email, dto.password);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refrescar(@Body() dto: RefreshTokenDto): Promise<ParDeTokens> {
    return this.authService.refrescar(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  obtenerPerfil(@CurrentUser() usuario: UsuarioAutenticado): Promise<UsuarioAutenticado> {
    return this.authService.obtenerPerfil(usuario.id);
  }
}
