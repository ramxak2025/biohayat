/**
 * Дизайн-система ХАЯТ. Единственная точка импорта для экранов:
 *   import { Screen, AppText, Button } from "@/components/ui";
 */
export {
  useStackScreenOptions,
  useDetailScreenOptions,
  useTransparentHeaderOptions,
  type StackScreenOptionsConfig,
} from "./stack-options";
export { Screen, useTabBarInset, TAB_BAR_HEIGHT, type ScreenProps , useHeaderInset } from "./screen";
export { AppText, type AppTextProps, type TextVariant, type TextTone } from "./app-text";
export { PressableScale, type PressableScaleProps, type PressHaptic } from "./press-scale";
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from "./button";
export { IconButton, type IconButtonProps, type IconButtonVariant } from "./icon-button";
export { Card, type CardProps, type CardTone } from "./card";
export { Badge, type BadgeProps, type BadgeTone, type BadgeSize } from "./badge";
export { Chip, type ChipProps } from "./chip";
export { Input, PhoneInput, PasswordInput, type InputProps, type PhoneInputProps, type PasswordInputProps } from "./input";
export { Stepper, type StepperProps } from "./stepper";
export { Price, type PriceProps, type PriceValue, type PriceSize } from "./price";
export { Skeleton, ProductCardSkeleton, ListSkeleton, type SkeletonProps, type ProductCardSkeletonProps, type ListSkeletonProps } from "./skeleton";
export { EmptyState, type EmptyStateProps } from "./empty-state";
export { ErrorState, errorMessage, type ErrorStateProps } from "./error-state";
export { GlassSurface, useReduceTransparency, type GlassSurfaceProps } from "./glass-surface";
export { SectionHeader, type SectionHeaderProps } from "./section-header";
export { Divider, type DividerProps } from "./divider";
export { Spacer, type SpacerProps } from "./spacer";
export { BadDisclaimer, type BadDisclaimerProps } from "./bad-disclaimer";
export { AppErrorScreen, type AppErrorScreenProps } from "./app-error-screen";
