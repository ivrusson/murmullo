import { Flex } from '@/components/layout';
import { Button, Card, CardContent } from '@/components/ui';
import { Text, Icon } from '@/components/ui';
import { RefreshCw, Mic, MicOff } from 'lucide-react';
import type { AudioDevice } from '../../types';

interface DeviceSelectorProps {
  devices: AudioDevice[];
  selectedDevice: string;
  onDeviceChange: (deviceId: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  className?: string;
}

export function DeviceSelector({
  devices,
  selectedDevice,
  onDeviceChange,
  onRefresh,
  isRefreshing = false,
  className = ''
}: DeviceSelectorProps) {
  const selectedDeviceInfo = devices.find(d => d.id === selectedDevice);

  return (
    <div className={className}>
      <Flex justify="between" align="center" className="mb-3">
        <Text weight="medium" size="sm">Microphone</Text>
        {onRefresh && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <Icon 
              icon={RefreshCw} 
              size="sm" 
              className={isRefreshing ? "animate-spin" : ""} 
            />
          </Button>
        )}
      </Flex>

      {devices.length === 0 ? (
        <Card>
          <CardContent className="p-4">
            <Flex align="center" gap="sm">
              <Icon icon={MicOff} size="sm" color="muted" />
              <Text color="muted">No microphones found</Text>
            </Flex>
          </CardContent>
        </Card>
      ) : (
        <select 
          className="w-full p-3 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
          value={selectedDevice}
          onChange={(e) => onDeviceChange(e.target.value)}
        >
          {devices.map((device) => (
            <option key={device.id} value={device.id}>
              {device.name}
            </option>
          ))}
        </select>
      )}

      {selectedDeviceInfo && (
        <Flex align="center" gap="sm" className="mt-2">
          <Icon icon={Mic} size="xs" color="success" />
          <Text size="xs" color="muted">
            Selected: {selectedDeviceInfo.name}
          </Text>
        </Flex>
      )}
    </div>
  );
}
