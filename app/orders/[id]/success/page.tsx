// app/orders/[id]/success/page.tsx
export default async function SuccessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // acá se resuelve la Promise
  const orderId = id;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-13 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">¡Gracias por tu compra!</h1>
        <p className="text-gray-600 mb-6">
          Tu pedido <span className="font-semibold text-orange-600">#{orderId}</span> fue procesado con éxito.
        </p>
        <p className="text-sm text-gray-400">
          Te estará llegando la informacion del pedido a tu mail. <br /> Se recomienda guardar el numero de pedido
        </p>
        <a
          href="/products"
          className="mt-6 inline-block px-6 py-3 rounded-md bg-orange-600 text-white font-medium shadow-md hover:bg-orange-700 transition-colors duration-200"
        >
          Volver a la tienda
        </a>
      </div>
    </div>
  );
}
