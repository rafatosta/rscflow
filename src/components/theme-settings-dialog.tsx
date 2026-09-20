import { Settings } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { SidebarMenuButton } from "@/components/ui/sidebar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTheme, type Theme } from "@/hooks/use-theme"

const themeOptions: { value: Theme; label: string }[] = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
  { value: "system", label: "Usar configuração do sistema" },
]

export function ThemeSettingsDialog() {
  const { theme, setTheme } = useTheme()

  return (
    <Dialog>
      <DialogTrigger
        render={
          <SidebarMenuButton tooltip="Configurações" aria-label="Abrir configurações de aparência">
            <Settings />
            <span>Configurações</span>
          </SidebarMenuButton>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aparência e acessibilidade</DialogTitle>
          <DialogDescription>
            Escolha entre os temas claro e escuro ou permita que o RSCFlow acompanhe a configuração do seu dispositivo. Em todos os modos, o sistema mantém textos legíveis, contraste adequado e indicação visível de foco para navegação pelo teclado.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="theme-preference">Tema</label>
          <Select value={theme} onValueChange={(value) => value && setTheme(value as Theme)}>
            <SelectTrigger id="theme-preference" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {themeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </DialogContent>
    </Dialog>
  )
}