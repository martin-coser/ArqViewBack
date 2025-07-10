import { Injectable } from '@nestjs/common';
import { CreateListaDeInteresDto } from './dto/create-lista-de-intere.dto';
import { UpdateListaDeInteresDto } from './dto/update-lista-de-intere.dto';


@Injectable()
export class ListaDeInteresService {
  create(createListaDeIntereDto: CreateListaDeInteresDto) {
    return 'This action adds a new listaDeIntere';
  }

  findAll() {
    return `This action returns all listaDeInteres`;
  }

  findOne(id: number) {
    return `This action returns a #${id} listaDeIntere`;
  }

  update(id: number, updateListaDeIntereDto: UpdateListaDeInteresDto) {
    return `This action updates a #${id} listaDeIntere`;
  }

  remove(id: number) {
    return `This action removes a #${id} listaDeIntere`;
  }
}
