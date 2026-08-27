import "../styles/components/footer.css";

export default function Footer({ simple = false }) {
  return (
    <div className="app-footer">
      <div>
        Copyright &copy; {new Date().getFullYear()}{" "}
        <a href="./" className="app-footer__link">
          Adese
        </a>{" "}
        v5.0
      </div>
    </div>
  );
}
