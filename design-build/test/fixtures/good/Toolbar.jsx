// expect: no errors
export function Toolbar({ onSave }) {
  return (
    <div className="toolbar">
      <Button variant="primary" onClick={onSave}>Save</Button>
      <Button variant="ghost" disabled>Undo</Button>
      <Badge variant="info">Draft</Badge>
    </div>
  );
}
