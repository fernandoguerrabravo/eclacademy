import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";
import { CartSidebar } from "@/components/CartSidebar";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <CartProvider>
        <Navbar />
        {children}
        <CartSidebar />
      </CartProvider>
    </AuthProvider>
  );
}
