import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const UtilisateurCourant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);


export const CLE_ROLES = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(CLE_ROLES, roles);
