import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-primary hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // StudyAI custom variants
        study: "bg-gradient-primary text-primary-foreground shadow-primary hover:shadow-glow transition-all duration-300",
        wellness: "bg-gradient-wellness text-wellness-foreground shadow-wellness hover:shadow-glow transition-all duration-300",
        gamify: "bg-gradient-gamify text-gamify-foreground shadow-gamify hover:shadow-glow transition-all duration-300 hover:scale-105",
        glass: "glass backdrop-blur-md text-foreground border hover:bg-white/20 transition-all duration-300",
        hero: "bg-gradient-hero text-white shadow-glow hover:shadow-primary transition-all duration-500 hover:scale-105 animate-gradient",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        xl: "h-12 rounded-lg px-10 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export { buttonVariants, type VariantProps };