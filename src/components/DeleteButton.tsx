"use client";

export default function DeleteButton({
  action,
  id,
  label = "Excluir",
  confirmMsg = "Tem certeza que deseja excluir?",
}: {
  action: (formData: FormData) => void;
  id: string;
  label?: string;
  confirmMsg?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmMsg)) e.preventDefault();
      }}
      style={{ display: "inline" }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="link danger">
        {label}
      </button>
    </form>
  );
}
