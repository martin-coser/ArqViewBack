import { PartialType } from '@nestjs/mapped-types';
import { CreateChatIaDto } from './create-chat-ia.dto';

export class UpdateChatIaDto extends PartialType(CreateChatIaDto) {}
