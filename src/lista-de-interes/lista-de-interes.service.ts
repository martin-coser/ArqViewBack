import { Injectable } from '@nestjs/common';
import { CreateListaDeIntereDto } from './dto/create-lista-de-intere.dto';
import { UpdateListaDeIntereDto } from './dto/update-lista-de-intere.dto';

@Injectable()
export class ListaDeInteresService {
  create(createListaDeIntereDto: CreateListaDeIntereDto) {
    return 'This action adds a new listaDeIntere';
  }

  findAll() {
    return `This action returns all listaDeInteres`;
  }

  findOne(id: number) {
    return `This action returns a #${id} listaDeIntere`;
  }

  update(id: number, updateListaDeIntereDto: UpdateListaDeIntereDto) {
    return `This action updates a #${id} listaDeIntere`;
  }

  remove(id: number) {
    return `This action removes a #${id} listaDeIntere`;
  }
}
