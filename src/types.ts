// Sandbox tokens disponíveis para o atributo sandbox do iframe
export type SandboxToken =
  | 'allow-downloads'
  | 'allow-forms'
  | 'allow-modals'
  | 'allow-orientation-lock'
  | 'allow-pointer-lock'
  | 'allow-popups'
  | 'allow-popups-to-escape-sandbox'
  | 'allow-presentation'
  | 'allow-same-origin'
  | 'allow-scripts'
  | 'allow-storage-access-by-user-activation'
  | 'allow-top-navigation'
  | 'allow-top-navigation-by-user-activation'
  | 'allow-top-navigation-to-custom-protocols';

// Diretivas disponíveis para Permissions Policy (allow attribute)
export type AllowDirective =
  | 'accelerometer'
  | 'ambient-light-sensor'
  | 'autoplay'
  | 'battery'
  | 'camera'
  | 'display-capture'
  | 'document-domain'
  | 'encrypted-media'
  | 'fullscreen'
  | 'gamepad'
  | 'geolocation'
  | 'gyroscope'
  | 'hid'
  | 'identity-credentials-get'
  | 'idle-detection'
  | 'local-fonts'
  | 'magnetometer'
  | 'microphone'
  | 'midi'
  | 'otp-credentials'
  | 'payment'
  | 'picture-in-picture'
  | 'publickey-credentials-create'
  | 'publickey-credentials-get'
  | 'screen-wake-lock'
  | 'serial'
  | 'speaker-selection'
  | 'usb'
  | 'web-share'
  | 'xr-spatial-tracking'
  | 'clipboard-write';

export type LoadingValue = 'eager' | 'lazy';

export type ReferrerPolicy =
  | 'no-referrer'
  | 'no-referrer-when-downgrade'
  | 'origin'
  | 'origin-when-cross-origin'
  | 'same-origin'
  | 'strict-origin'
  | 'strict-origin-when-cross-origin'
  | 'unsafe-url';

export interface IframeAttributes {
  sandbox?: string;
  allow?: string;
  loading?: LoadingValue;
  referrerpolicy?: ReferrerPolicy;
  allowfullscreen?: boolean;
  credentialless?: boolean;
  name?: string;
  title?: string;
  csp?: string;
}

export type Item = {
  id: string;
  sort: number;
  status: 'draft' | 'published' | 'archived';
  icon: string;
  url: string;
  thumbnail: string;
  translations: {
    language: string;
    title: string;
  }[];
  // Novos campos para configuração do iframe
  sandbox_tokens?: string | string[] | null;
  allow_directives?: string | string[] | null;
  loading?: LoadingValue | null;
  referrerpolicy?: ReferrerPolicy | null;
  allowfullscreen?: boolean | null;
  credentialless?: boolean | null;
  iframe_name?: string | null;
  iframe_title?: string | null;
  csp?: string | null;
};

export interface UserData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  language: string;
}

export interface SecurityValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
