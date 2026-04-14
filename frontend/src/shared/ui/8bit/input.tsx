import { Input as BaseInput } from "@/shared/ui/input";
import { cn } from "@/shared/lib/utils";

import "@/shared/ui/8bit/styles/retro.css";

type BitInputProps = React.ComponentProps<typeof BaseInput> & {
  font?: "normal" | "retro";
};

function Input({ className, font = "retro", ...props }: BitInputProps) {
  return (
    <BaseInput
      className={cn(
        "rounded-none border-2 border-foreground shadow-none dark:border-ring",
        font === "retro" && "retro",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
