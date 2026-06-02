interface TimestampDividerProps {
  label: string;
}

export function TimestampDivider({ label }: TimestampDividerProps) {
  return (
    <div className="wh-msg-timestamp" data-testid="timestamp-divider">
      {label}
    </div>
  );
}
