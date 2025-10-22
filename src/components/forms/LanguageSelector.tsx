import { Flex } from '@/components/layout';
import { Text, Icon } from '@/components/ui';
import { Globe } from 'lucide-react';

interface Language {
  value: string;
  label: string;
  flag?: string;
}

interface LanguageSelectorProps {
  languages: Language[];
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  className?: string;
}

export function LanguageSelector({
  languages,
  selectedLanguage,
  onLanguageChange,
  className = ''
}: LanguageSelectorProps) {
  const selectedLanguageInfo = languages.find(l => l.value === selectedLanguage);

  return (
    <div className={className}>
      <Flex align="center" gap="sm" className="mb-3">
        <Icon icon={Globe} size="sm" />
        <Text weight="medium" size="sm">Language</Text>
      </Flex>

      <select 
        className="w-full p-3 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
        value={selectedLanguage}
        onChange={(e) => onLanguageChange(e.target.value)}
      >
        {languages.map((language) => (
          <option key={language.value} value={language.value}>
            {language.flag && `${language.flag} `}{language.label}
          </option>
        ))}
      </select>

      {selectedLanguageInfo && (
        <Flex align="center" gap="sm" className="mt-2">
          <Icon icon={Globe} size="xs" color="success" />
          <Text size="xs" color="muted">
            Selected: {selectedLanguageInfo.label}
          </Text>
        </Flex>
      )}
    </div>
  );
}
