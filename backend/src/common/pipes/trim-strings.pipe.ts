import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class TrimStringsPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    void metadata;

    if (typeof value === 'string') {
      return value.trim();
    }

    return value;
  }
}
