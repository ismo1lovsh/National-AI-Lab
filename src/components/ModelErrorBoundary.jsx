import { Component } from 'react';

/**
 * Bitta model yuklanmasa BUTUN 3D sahna qulab tushardi va o'qituvchi qop-qora
 * ekranni ko'rardi. Endi xato faqat shu model bilan cheklanadi: sahna,
 * xona, doska va boshqaruv ishlashda davom etadi.
 *
 * Sahna ICHIDA ishlaydi — shuning uchun fallback ham 3D obyekt bo'lishi kerak.
 */
export default class ModelErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(err) {
    console.warn('[MODEL] yuklanmadi:', err?.message || err);
  }

  componentDidUpdate(prev) {
    // Boshqa modelga o'tilganda qayta urinib ko'ramiz
    if (prev.resetKey !== this.props.resetKey && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (this.state.failed) {
      return (
        <mesh>
          <sphereGeometry args={[0.55, 20, 16]} />
          <meshStandardMaterial color="#7d3b3b" wireframe opacity={0.6} transparent />
        </mesh>
      );
    }
    return this.props.children;
  }
}
