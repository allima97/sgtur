import React from "react";

export default function ModalShell(props: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-head">
          <div className="modal-title">{props.title}</div>
          <button className="btn-light" onClick={props.onClose}>
            Fechar
          </button>
        </div>
        <div className="modal-body">{props.children}</div>
      </div>
    </div>
  );
}
