import React from 'react';
import { MapPin, Phone, Mail, Facebook, Instagram, Twitter, CreditCard } from 'lucide-react';

interface FooterProps {
  onNavigate: (page: string) => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-neutral-gray-900 text-neutral-gray-300">
      <div className="container-custom py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          <div>
            <div className="flex items-center mb-4">
              <span className="text-xl font-bold text-white">Pizza Spartaco</span>
            </div>
            <p className="text-sm mb-4">
              La vera pizza romana, certificata. Delivery e Take away nel cuore di Roma.
            </p>
            <div className="flex space-x-3">
              <a
                href="https://www.facebook.com/pizzaspartaco/?locale=it_IT"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-neutral-gray-800 rounded-lg flex items-center justify-center hover:bg-primary-orange transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://www.instagram.com/pinsa_spartacotuscolana/?hl=it"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-neutral-gray-800 rounded-lg flex items-center justify-center hover:bg-primary-orange transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Menu Rapido</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  onClick={() => onNavigate('home')}
                  className="hover:text-primary-orange transition-colors"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('menu')}
                  className="hover:text-primary-orange transition-colors"
                >
                  Menù
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('about')}
                  className="hover:text-primary-orange transition-colors"
                >
                  Chi Siamo
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('contact')}
                  className="hover:text-primary-orange transition-colors"
                >
                  Contatti
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Contatti</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start space-x-2">
                <MapPin className="w-5 h-5 text-primary-orange flex-shrink-0 mt-0.5" />
                <span>Viale Spartaco, 73, 00174 Roma RM</span>
              </li>
              <li className="flex items-center space-x-2">
                <Phone className="w-5 h-5 text-primary-orange flex-shrink-0" />
                <a href="tel:+393809045366" className="hover:text-primary-orange transition-colors">
                  +39 380 904 5366
                </a>
              </li>
              <li className="flex items-center space-x-2">
                <Mail className="w-5 h-5 text-primary-orange flex-shrink-0" />
                <a href="mailto:ordini@pizzaspartaco.it" className="hover:text-primary-orange transition-colors">
                  ordini@pizzaspartaco.it
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Orari di Apertura</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between">
                <span>domenica</span>
                <span className="text-white font-medium">17–22</span>
              </li>
              <li className="flex justify-between">
                <span>lunedì</span>
                <span className="text-white font-medium">Chiuso</span>
              </li>
              <li className="flex justify-between">
                <span>martedì</span>
                <span className="text-white font-medium">11–15, 17–22</span>
              </li>
              <li className="flex justify-between">
                <span>mercoledì</span>
                <span className="text-white font-medium">11–15, 17–22</span>
              </li>
              <li className="flex justify-between">
                <span>giovedì</span>
                <span className="text-white font-medium">11–15, 17–22</span>
              </li>
              <li className="flex justify-between">
                <span>venerdì</span>
                <span className="text-white font-medium">11–15, 17–22</span>
              </li>
              <li className="flex justify-between">
                <span>sabato</span>
                <span className="text-white font-medium">17–22</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-neutral-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm">
              <button
                className="hover:text-primary-orange transition-colors"
                onClick={() => {
                  try {
                    onNavigate('privacy');
                    setTimeout(() => {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }, 0);
                  } catch {
                    try {
                      window.history.pushState({ page: 'privacy' }, '', '/Privacy');
                      window.dispatchEvent(new PopStateEvent('popstate'));
                      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0);
                    } catch {
                      window.location.href = '/Privacy#top';
                    }
                  }
                }}
              >
                Privacy Policy
              </button>
              <span className="text-neutral-gray-700">|</span>
              <button
                className="hover:text-primary-orange transition-colors"
                onClick={() => {
                  try {
                    window.dispatchEvent(new CustomEvent('cookie-consent:preferences'));
                  } catch {}
                }}
              >
                Impostazioni cookies
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-sm text-neutral-gray-500">
            Powered by CAPITALNET - © 2025 Pizza Spartaco. Tutti i diritti riservati.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
