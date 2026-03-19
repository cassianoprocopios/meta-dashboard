import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Plus, Minus } from "lucide-react";
import { useState } from "react";

interface DailyTargetConfigProps {
  value: number;
  onChange: (value: number) => void;
}

export default function DailyTargetConfig({
  value,
  onChange,
}: DailyTargetConfigProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());

  const handleSave = () => {
    const newValue = parseFloat(inputValue);
    if (!isNaN(newValue) && newValue > 0) {
      onChange(newValue);
      setIsEditing(false);
    }
  };

  const increment = () => onChange(value + 500);
  const decrement = () => onChange(Math.max(0, value - 500));

  return (
    <Card className="p-6 border-0 shadow-sm bg-gradient-to-r from-slate-50 to-blue-50">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            Meta Diária
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Configure o valor alvo para monitoramento diário
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-24 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button
                onClick={handleSave}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Salvar
              </Button>
              <Button
                onClick={() => setIsEditing(false)}
                variant="outline"
                className="text-slate-600"
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-3xl font-bold text-blue-600">
                  R$ {value.toFixed(0)}
                </p>
                <p className="text-xs text-slate-500 mt-1">por dia</p>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={increment}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <Button
                  onClick={decrement}
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Minus className="w-4 h-4" />
                </Button>
              </div>
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                className="text-slate-600"
              >
                Editar
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
