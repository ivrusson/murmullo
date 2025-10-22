import { useCreation, useMount, useReactive } from "ahooks";
import { Container, Section, Flex } from '@/components/layout';
import { Button, Badge } from '@/components/ui';
import { Heading, Text, Icon } from '@/components/ui';
import { Shield, CheckCircle, AlertCircle, Mic, Keyboard, Settings, RefreshCw } from 'lucide-react';
import {
  checkAccessibilityPermission,
  requestAccessibilityPermission,
  checkMicrophonePermission,
  requestMicrophonePermission,
  checkInputMonitoringPermission,
  requestInputMonitoringPermission,
} from "tauri-plugin-macos-permissions-api";

export function PermissionsPage() {
  const state = useReactive({
    accessibilityPermission: false,
    microphonePermission: false,
    inputMonitoringPermission: false,
  });

  const loadPermissions = async () => {
    state.accessibilityPermission = await checkAccessibilityPermission();
    state.microphonePermission = await checkMicrophonePermission();
    state.inputMonitoringPermission = await checkInputMonitoringPermission();
  };

  useMount(() => {
    loadPermissions();
  });

  const permissions = useCreation(() => {
    return [
      {
        label: "Microphone",
        description: "Required for audio recording and voice transcription.",
        value: state.microphonePermission,
        request: async () => {
          await requestMicrophonePermission();
          state.microphonePermission = await checkMicrophonePermission();
        },
        icon: Mic,
      },
      {
        label: "Accessibility",
        description: "Required for global hotkeys and text insertion functionality.",
        value: state.accessibilityPermission,
        request: async () => {
          await requestAccessibilityPermission();
          state.accessibilityPermission = await checkAccessibilityPermission();
        },
        icon: Settings,
      },
      {
        label: "Input Monitoring",
        description: "Required for global keyboard shortcuts and push-to-talk.",
        value: state.inputMonitoringPermission,
        request: async () => {
          await requestInputMonitoringPermission();
          state.inputMonitoringPermission = await checkInputMonitoringPermission();
        },
        icon: Keyboard,
      },
    ];
  }, [state]);

  const allGranted = permissions.every(p => p.value);

  return (
    <div className="min-h-full bg-background">
      <Container size="lg" padding="sm">
        <Section spacing="md">
          {/* Header */}
          <Flex direction="column" gap="xs" className="mb-4">
            <Flex align="center" gap="sm">
              <Icon icon={Shield} size="lg" color="primary" />
              <Heading level={1} size="xl" className="font-semibold">Permissions</Heading>
            </Flex>
            <Text color="muted" size="sm" className="font-light">Essential permissions for Murmullo to function properly</Text>
          </Flex>

          {/* Refresh Button */}
          <div className="mb-4">
            <Button
              onClick={loadPermissions}
              size="sm"
              variant="outline"
              className="text-xs px-3 py-1 bg-white border-border hover:bg-surface-2"
            >
              <Icon icon={RefreshCw} size="sm" />
              Refresh Permissions
            </Button>
          </div>

          {/* Status */}
          <div className="mb-4">
            <div className={`p-3 rounded-lg ${
              allGranted 
                ? 'bg-success/10' 
                : 'bg-destructive/10'
            }`}>
              <Flex align="center" gap="sm">
                <Icon 
                  icon={allGranted ? CheckCircle : AlertCircle} 
                  size="sm" 
                  color={allGranted ? "success" : "destructive"} 
                />
                <Text weight="medium" className={`text-sm ${
                  allGranted ? 'text-success' : 'text-destructive'
                }`}>
                  {allGranted ? 'All permissions granted' : 'Some permissions required'}
                </Text>
              </Flex>
            </div>
          </div>

          {/* Permissions List */}
          <div className="space-y-2">
            {permissions.map((permission) => (
              <div key={permission.label} className="flex justify-between items-center py-3 px-3 bg-surface-2 rounded-lg hover:bg-surface-3 transition-colors">
                <Flex align="center" gap="sm">
                  <Icon icon={permission.icon} size="sm" color="primary" />
                  <Flex direction="column" gap="xs">
                    <Text weight="medium" className="text-foreground text-sm">{permission.label}</Text>
                    <Text size="xs" color="muted" className="font-light">{permission.description}</Text>
                  </Flex>
                </Flex>
                <Flex align="center" gap="md">
                  <Badge 
                    variant={permission.value ? "secondary" : "destructive"}
                    className={permission.value ? "bg-success/10 text-success border-success/20 text-xs" : "bg-destructive/10 text-destructive border-destructive/20 text-xs"}
                  >
                    {permission.value ? "Granted" : "Required"}
                  </Badge>
                  {!permission.value && (
                    <Button
                      onClick={permission.request}
                      size="sm"
                      className="text-xs px-4 py-1 bg-black text-white hover:bg-gray-800"
                    >
                      Grant
                    </Button>
                  )}
                </Flex>
              </div>
            ))}
          </div>

          {/* Instructions */}
          <div className="mt-6">
            <Flex align="center" gap="sm" className="mb-3">
              <Icon icon={AlertCircle} size="sm" color="primary" />
              <Text weight="medium" className="text-foreground text-sm">How to Grant Permissions</Text>
            </Flex>
            
            <div className="space-y-1 text-xs text-muted-foreground font-light pl-6">
              <div>1. Open System Preferences → Security & Privacy → Privacy</div>
              <div>2. Select the permission category (Microphone, Accessibility, etc.)</div>
              <div>3. Add Murmullo to the list</div>
              <div>4. Restart Murmullo for changes to take effect</div>
            </div>
          </div>
        </Section>
      </Container>
    </div>
  );
}