import Link from "next/link";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="logo footer-logo">
              <i className="fas fa-graduation-cap"></i>
              <span>
                ECL <strong>Academy</strong>
              </span>
            </div>
            <p>
              Ecommerce Logistics LLC - Educación especializada para sellers de
              Amazon en Latinoamérica que buscan expandirse al mercado de
              Estados Unidos.
            </p>
          </div>
          <div className="footer-links">
            <h4>Cursos</h4>
            <ul>
              <li><Link href="/cursos/cumplimiento-aduanero">Cumplimiento Aduanero</Link></li>
              <li><Link href="/cursos/regulaciones-fda">Regulaciones FDA</Link></li>
              <li><Link href="/cursos/gestion-fintech">Gestión Fintech</Link></li>
              <li><Link href="/cursos/logistica-internacional-fba">Logística Internacional</Link></li>
              <li><Link href="/cursos/cumplimiento-usda">Cumplimiento USDA</Link></li>
              <li><Link href="/cursos/tratados-libre-comercio">Tratados Comerciales</Link></li>
            </ul>
          </div>
          <div className="footer-links">
            <h4>Recursos</h4>
            <ul>
              <li><a href="#">Blog</a></li>
              <li><a href="#">Guías Gratuitas</a></li>
              <li><a href="#">Webinars</a></li>
              <li><a href="#">Comunidad</a></li>
            </ul>
          </div>
          <div className="footer-links">
            <h4>Compañía</h4>
            <ul>
              <li><a href="#">Sobre Nosotros</a></li>
              <li><a href="#">Contacto</a></li>
              <li><a href="#">Términos de Uso</a></li>
              <li><a href="#">Política de Privacidad</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 Ecommerce Logistics LLC. Todos los derechos reservados.</p>
          <div className="footer-social">
            <a href="#" aria-label="Facebook"><i className="fab fa-facebook"></i></a>
            <a href="#" aria-label="Instagram"><i className="fab fa-instagram"></i></a>
            <a href="#" aria-label="LinkedIn"><i className="fab fa-linkedin"></i></a>
            <a href="#" aria-label="YouTube"><i className="fab fa-youtube"></i></a>
          </div>
        </div>
      </div>
    </footer>
  );
}
