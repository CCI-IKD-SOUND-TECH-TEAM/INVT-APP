import {
  AdjustmentsHorizontalIcon,
  Battery50Icon,
  BoltIcon,
  Cog6ToothIcon,
  CubeIcon,
  LightBulbIcon,
  MicrophoneIcon,
  RectangleStackIcon,
  SpeakerWaveIcon,
  TvIcon,
  VideoCameraIcon,
} from "@heroicons/react/24/outline";
import type { ComponentType, SVGProps } from "react";

type HeroIcon = ComponentType<SVGProps<SVGSVGElement>>;

export const CATEGORY_ICON: Record<string, HeroIcon> = {
  Speakers: SpeakerWaveIcon,
  Microphones: MicrophoneIcon,
  "Mixing Consoles": AdjustmentsHorizontalIcon,
  "Cabling & Connectors": BoltIcon,
  "Lighting Fixtures": LightBulbIcon,
  "Lighting Controllers": Cog6ToothIcon,
  Projectors: VideoCameraIcon,
  "Screens & Mounts": TvIcon,
  "Stands & Rigging": RectangleStackIcon,
  "Power & Batteries": Battery50Icon,
};

export function categoryIcon(category: string): HeroIcon {
  return CATEGORY_ICON[category] ?? CubeIcon;
}
