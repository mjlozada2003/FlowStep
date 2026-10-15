import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async register(createUserDto: CreateUserDto): Promise<Omit<User, 'password_hash'>> {
    const { name, email, password } = createUserDto;

    // Verificar si el correo ya existe
    const existingUser = await this.usersRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('El correo electrónico ya está registrado');
    }

    // Hashear la contraseña
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Crear y guardar el usuario
    const newUser = this.usersRepository.create({
      name,
      email,
      password_hash,
    });

    const savedUser = await this.usersRepository.save(newUser);
    
    // Devolver el usuario sin el hash de la contraseña por seguridad
    const { password_hash: _, ...result } = savedUser;
    return result as Omit<User, 'password_hash'>;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }
}
