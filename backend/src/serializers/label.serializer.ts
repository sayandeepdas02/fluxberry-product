import type { LabelDto } from '@fluxberry/shared';

export function toLabelDto(l: any): LabelDto {
  return {
    id: String(l._id),
    workspaceId: String(l.workspaceId),
    name: l.name,
    color: l.color,
    createdAt: new Date(l.createdAt).toISOString(),
  };
}
