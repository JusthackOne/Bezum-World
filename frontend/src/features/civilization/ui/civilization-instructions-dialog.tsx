"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  CircleAlertIcon,
  CircleHelpIcon,
  GiftIcon,
  MapPinnedIcon,
  ShieldIcon,
  TargetIcon,
  ZapIcon,
} from "lucide-react";

import { CIVILIZATION_ASSETS, type CivilizationAssetKey } from "@/entities/civilization";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/8bit";

interface BuildingInstruction {
  assetKey: CivilizationAssetKey;
  name: string;
  description: string;
}

const CIVILIZATION_INSTRUCTIONS_VIEWED_KEY = "civilization-instructions-viewed-v1";

const BUILDING_INSTRUCTIONS: BuildingInstruction[] = [
  {
    assetKey: "townHall",
    name: "Ратуша",
    description:
      "Главное здание команды и источник связности территории. Вражескую ратушу нельзя захватить обычным действием — наносите ей урон только катапультой. Полный захват ратуши завершает игру.",
  },
  {
    assetKey: "goldBuilding",
    name: "Золотое здание",
    description:
      "Приносит командное золото, пока находится на связной территории. Его можно захватывать обычным действием или ускорить захват катапультой.",
  },
  {
    assetKey: "attributeBuilding.strength",
    name: "Здание силы",
    description:
      "Производит силу для итогового счёта и наград команды. Работает только при соединении с ратушей по территории вашей команды.",
  },
  {
    assetKey: "attributeBuilding.charisma",
    name: "Здание харизмы",
    description:
      "Производит харизму для итогового счёта и наград. Захватите здание и сохраните непрерывный путь до своей ратуши.",
  },
  {
    assetKey: "attributeBuilding.endurance",
    name: "Здание выносливости",
    description:
      "Производит выносливость для итогового счёта и наград. Отключается, если территория отрезана от ратуши.",
  },
  {
    assetKey: "attributeBuilding.intelligence",
    name: "Здание интеллекта",
    description:
      "Производит интеллект для итогового счёта и наград. Контроль здания полезен только вместе со связной территорией.",
  },
  {
    assetKey: "tower.active",
    name: "Защитная башня",
    description:
      "Защищает клетки и здания в своём радиусе, если соединена с ратушей. Башню можно атаковать с границы её зоны, быстрее разрушить катапультой и восстановить ремонтным набором.",
  },
];

const IMPORTANT_RULES = [
  {
    icon: TargetIcon,
    title: "Цель игры",
    text: "Захватите вражескую ратушу катапультой или наберите больше итоговых очков к завершению времени игры.",
  },
  {
    icon: ZapIcon,
    title: "Очки действий",
    text: "Перемещение, бой и работа с постройками расходуют очки действий. Они восстанавливаются со временем, поэтому планируйте маршрут заранее.",
  },
  {
    icon: ShieldIcon,
    title: "Защита",
    text: "Активные связные башни блокируют захват и обстрел защищённых зданий. Защитников на целевой клетке также необходимо победить до применения катапульты.",
  },
  {
    icon: CircleAlertIcon,
    title: "Командные ресурсы",
    text: "Золото общее для всей команды. Катапульта, башни и ремонт расходуют его, а отрезанные территории и здания перестают приносить доход.",
  },
  {
    icon: MapPinnedIcon,
    title: "Карта и возрождение",
    text: "Горы непроходимы, а на вражескую точку появления заходить нельзя. После поражения персонаж возвращается на точку появления своей команды.",
  },
  {
    icon: GiftIcon,
    title: "Счёт и награды",
    text: "Золото и четыре атрибута влияют на итоговый результат. После завершения игры не забудьте забрать доступную награду.",
  },
];

export function CivilizationInstructionsDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let shouldOpen = true;
    try {
      shouldOpen = localStorage.getItem(CIVILIZATION_INSTRUCTIONS_VIEWED_KEY) !== "true";
    } catch {
      // The instruction opens by default when browser storage is unavailable.
    }

    const timer = window.setTimeout(() => setOpen(shouldOpen), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleOpenChange = (nextOpen: boolean): void => {
    setOpen(nextOpen);
    if (nextOpen) {
      return;
    }
    try {
      localStorage.setItem(CIVILIZATION_INSTRUCTIONS_VIEWED_KEY, "true");
    } catch {
      // The instruction remains usable when browser storage is unavailable.
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label="Открыть инструкцию по игре"
          title="Как играть"
        >
          <CircleHelpIcon className="size-5" />
        </Button>
      </DialogTrigger>

      <DialogContent
        className="block max-h-[calc(100vh-2rem)] overflow-hidden border-b-6 border-foreground p-0 sm:max-w-4xl dark:border-ring"
        font="normal"
      >
        <div className="max-h-[calc(100vh-2rem)] space-y-4 overflow-y-auto overscroll-contain p-6 pb-10">
        <DialogHeader className="pr-8">
          <DialogTitle>Как играть в «Цивилизацию»</DialogTitle>
          <DialogDescription>
            Посмотрите короткое видео, а затем ознакомьтесь с основными правилами и зданиями.
          </DialogDescription>
        </DialogHeader>

        <section className="space-y-3" aria-labelledby="civilization-video-title">
          <h2 id="civilization-video-title" className="text-base font-semibold">
            Видеоинструкция
          </h2>
          <video
            className="aspect-video w-full bg-black object-contain"
            controls
            playsInline
            preload="metadata"
          >
            <source src="/assets/civilization/instruction.mp4" type="video/mp4" />
            Ваш браузер не поддерживает воспроизведение видео.
          </video>
        </section>

        <section className="space-y-3" aria-labelledby="civilization-start-title">
          <h2 id="civilization-start-title" className="text-base font-semibold">
            Как начать
          </h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Нажмите на своего персонажа, чтобы увидеть доступные клетки и действия.</li>
            <li>Выберите подсвеченную клетку для перемещения, атаки или захвата здания.</li>
            <li>
              Катапульта, строительство башни и ремонтный набор выбираются на панели предметов карты.
            </li>
            <li>Удерживайте связную территорию и двигайтесь к ратуше противника.</li>
          </ol>
        </section>

        <section className="space-y-3" aria-labelledby="civilization-important-title">
          <h2 id="civilization-important-title" className="text-base font-semibold">
            Самое важное
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {IMPORTANT_RULES.map((rule) => {
              const Icon = rule.icon;
              return (
                <article key={rule.title} className="border bg-muted/30 p-3">
                  <div className="mb-2 flex items-center gap-2 font-medium">
                    <Icon className="size-4 text-primary" />
                    <h3>{rule.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{rule.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="space-y-3" aria-labelledby="civilization-buildings-title">
          <div>
            <h2 id="civilization-buildings-title" className="text-base font-semibold">
              Здания
            </h2>
            <p className="text-sm text-muted-foreground">
              Цвет элементов на карте соответствует команде-владельцу.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {BUILDING_INSTRUCTIONS.map((building) => {
              const asset = CIVILIZATION_ASSETS[building.assetKey];
              return (
                <article key={building.assetKey} className="flex gap-3 border p-3">
                  <div className="flex size-20 shrink-0 items-center justify-center bg-slate-950 p-1">
                    <Image
                      src={asset.path}
                      alt={building.name}
                      width={80}
                      height={80}
                      className="size-full object-contain"
                    />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-medium">{building.name}</h3>
                    <p className="text-sm text-muted-foreground">{building.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="space-y-2 border bg-amber-500/10 p-3 text-sm">
          <h2 className="font-semibold">Предметы</h2>
          <p>
            <strong>Катапульта:</strong> атакует вражеские башни и соседние здания. Только катапульта
            может наносить урон ратуше и завершить её захват.
          </p>
          <p>
            <strong>Ремонтный набор:</strong> восстанавливает соседнюю союзную башню или уменьшает
            вражеский прогресс захвата союзного здания.
          </p>
        </section>

        <DialogFooter>
          <Button type="button" onClick={() => handleOpenChange(false)}>
            Понятно, начать игру
          </Button>
        </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
