import { Card, CardContent, Button, Badge } from '@/components/ui';
import { Text, Icon, Spacer } from '@/components/ui';
import { Flex } from '@/components/layout';
import { CheckCircle, AlertCircle, Shield } from 'lucide-react';

interface PermissionItemProps {
  label: string;
  description: string;
  isGranted: boolean;
  isCritical: boolean;
  onRequest: () => void;
  className?: string;
}

export function PermissionItem({
  label,
  description,
  isGranted,
  isCritical,
  onRequest,
  className = ''
}: PermissionItemProps) {
  const getStatusIcon = () => {
    if (isGranted) {
      return <Icon icon={CheckCircle} size="sm" color="success" />;
    }
    return <Icon icon={AlertCircle} size="sm" color="destructive" />;
  };

  const getStatusBadge = () => {
    if (isGranted) {
      return (
        <Badge variant="secondary">
          <Icon icon={CheckCircle} size="xs" />
          <Spacer axis="x" size="xs" />
          Authorized
        </Badge>
      );
    }
    
    return (
      <Badge variant={isCritical ? "destructive" : "outline"}>
        {isCritical ? "Required" : "Optional"}
      </Badge>
    );
  };

  const getActionButton = () => {
    if (isGranted) {
      return null;
    }
    
    return (
      <Button 
        variant={isCritical ? "default" : "outline"} 
        onClick={onRequest}
        size="sm"
      >
        <Icon icon={Shield} size="sm" />
        <Spacer axis="x" size="sm" />
        Authorize
      </Button>
    );
  };

  return (
    <Card className={`${className} ${!isGranted && isCritical ? 'border-destructive/20' : ''}`}>
      <CardContent className="p-4">
        <Flex justify="between" align="center">
          <Flex align="center" gap="md" className="flex-1">
            {getStatusIcon()}
            <Flex direction="column" gap="xs">
              <Flex align="center" gap="sm">
                <Text weight="semibold">{label}</Text>
                {isCritical && (
                  <Icon icon={Shield} size="xs" color="destructive" />
                )}
              </Flex>
              <Text size="sm" color="muted">
                {description}
              </Text>
            </Flex>
          </Flex>
          
          <Flex align="center" gap="md">
            {getStatusBadge()}
            {getActionButton()}
          </Flex>
        </Flex>
      </CardContent>
    </Card>
  );
}
