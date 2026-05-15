import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Users } from 'lucide-react';

interface GoalVisibilityBadgeProps {
  visibility: string;
}

export function GoalVisibilityBadge({ visibility }: GoalVisibilityBadgeProps) {
  switch (visibility) {
    case 'SELF_ONLY':
      return (
        <Badge variant="secondary" className="flex w-fit items-center gap-1">
          <EyeOff className="h-3 w-3" />
          <span>非公開</span>
        </Badge>
      );
    case 'DEPARTMENT':
      return (
        <Badge variant="secondary" className="flex w-fit items-center gap-1">
          <Users className="h-3 w-3" />
          <span>部内公開</span>
        </Badge>
      );
    case 'COMPANY':
      return (
        <Badge variant="secondary" className="flex w-fit items-center gap-1">
          <Eye className="h-3 w-3" />
          <span>全社公開</span>
        </Badge>
      );
    default:
      return null;
  }
}
