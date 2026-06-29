import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Product } from '../services/api';
import { ProductCard } from '../components/ProductCard';

interface HomeProps {
  searchQuery: string;
  searchTrigger?: number;
  onAddToCart: (product: Product) => void;
}

export const Home: React.FC<HomeProps> = ({ searchQuery, searchTrigger = 0, onAddToCart }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const itemsPerPage = 4;

  useEffect(() => {
    // Reset to page 1 when query or trigger changes
    setCurrentPage(1);
  }, [searchQuery, searchTrigger]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const skip = (currentPage - 1) * itemsPerPage;
        const [productsRes, countRes] = await Promise.all([
          api.getProducts({ skip, limit: itemsPerPage, search: searchQuery }),
          api.getProductsCount(searchQuery),
        ]);
        setProducts(productsRes);
        setTotalPages(Math.ceil(countRes.count / itemsPerPage) || 1);
      } catch (err) {
        console.error('Failed to load products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();

    window.addEventListener('products-updated', fetchProducts);
    return () => {
      window.removeEventListener('products-updated', fetchProducts);
    };
  }, [currentPage, searchQuery, searchTrigger]);

  return (
    <div className="home-page-container">
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <span>Loading products...</span>
        </div>
      ) : (
        <>
          {products.length === 0 ? (
            <div className="empty-catalog">
              <h2>No products found</h2>
              <p>We couldn't find any products matching your search query.</p>
            </div>
          ) : (
            <>
              <div className="products-grid" data-cy="products">
                {products.map((product) => (
                  <ProductCard
                    key={product.productId}
                    product={product}
                    onAddToCart={onAddToCart}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <ul className="pagination" data-cy="pagination">
                  {Array.from({ length: totalPages }).map((_, index) => {
                    const pageNumber = index + 1;
                    return (
                      <li
                        key={pageNumber}
                        className={`page-item ${currentPage === pageNumber ? 'active' : ''}`}
                        data-cy="page-item"
                      >
                        <button onClick={() => setCurrentPage(pageNumber)}>
                          {pageNumber}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};
