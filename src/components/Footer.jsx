import "../styles/components/footer.css";

export default function Footer({ simple = false }) {
  return (
    <div className="app-footer">
      <div>
        Copyright &copy; {new Date().getFullYear()}{" "}
        <a href="./" className="app-footer__link">
          Adese
        </a>{" "}
        v3.5
      </div>
      {!simple && (
        <div className="app-footer__dev">
          Desarrollado por{" "}
          <a
            href="https://alan.arahocorp.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="app-footer__dev-link"
          >
            Alan
          </a>
        </div>
      )}
    </div>
  );
}
