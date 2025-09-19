import { SetMetadata } from "@nestjs/common";

export const PLANES_KEY = 'planes'; 
export const Planes = (...planes: string[]) => SetMetadata(PLANES_KEY, planes);