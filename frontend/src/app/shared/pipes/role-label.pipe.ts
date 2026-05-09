import { Pipe, PipeTransform } from '@angular/core';
import { UserRole } from '../../core/models/auth.model';

@Pipe({ name: 'roleLabel' })
export class RoleLabelPipe implements PipeTransform {
  transform(value: UserRole | string | null | undefined): string {
    const map: Record<string, string> = {
      ADMIN:           'Administrator',
      PROJECT_MANAGER: 'Project Manager',
      PROJECT_MEMBER:     'Project Member',
      CUSTOMER:        'Customer',
      //CLIENT:          'Customer'
    };
    return value ? (map[value] ?? value) : '';
  }
}
