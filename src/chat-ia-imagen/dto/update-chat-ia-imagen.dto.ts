import { PartialType } from '@nestjs/mapped-types';
import { CreateChatIaImagenDto } from './create-chat-ia-imagen.dto';

export class UpdateChatIaImagenDto extends PartialType(CreateChatIaImagenDto) {}
