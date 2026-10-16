'use client';

interface StateCycleOption<Value extends string> {
  value: Value;
  label: string;
  symbol: string;
  className: string;
}

interface StateCycleCheckboxProps<Value extends string> {
  value: Value;
  options: readonly StateCycleOption<Value>[];
  onChange: (value: Value) => void;
  disabled?: boolean;
}

export default function StateCycleCheckbox<Value extends string>({
  value,
  options,
  onChange,
  disabled = false,
}: StateCycleCheckboxProps<Value>) {
  const currentIndex = options.findIndex(option => option.value === value);
  const currentOption = options[currentIndex];

  if (!currentOption || options.length < 2) {
    throw new Error('StateCycleCheckbox requires a current value and at least two options.');
  }

  const nextOption = options[(currentIndex + 1) % options.length];

  return (
    <button
      type="button"
      aria-label={`État : ${currentOption.label}. Cliquer pour passer à ${nextOption.label}.`}
      title={`État : ${currentOption.label} · Cliquer pour : ${nextOption.label}`}
      disabled={disabled}
      onClick={() => onChange(nextOption.value)}
      className={`w-9 h-9 rounded border flex items-center justify-center text-lg font-semibold transition-colors disabled:cursor-wait disabled:opacity-50 ${currentOption.className}`}
    >
      {currentOption.symbol}
    </button>
  );
}
