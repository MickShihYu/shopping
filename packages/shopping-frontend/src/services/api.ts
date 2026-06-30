export enum PermissionKey {
  SuperAdminAccess = 'SuperAdminAccess',
  AdministratorAccess = 'AdministratorAccess',
  CustomerAccess = 'CustomerAccess',
  SupportAccess = 'SupportAccess',
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  roles?: string[];
  roleName?: string;
  permissions?: string[];
}

export interface Product {
  productId: string;
  name: string;
  price: number;
  image: string;
  description: string;
  details: string;
  inventory?: number;
  lowStockThreshold?: number;
  isActive?: boolean;
}

export interface CartItem {
  productId: string;
  quantity: number;
  name: string;
  price?: number;
  image?: string;
}

export interface Cart {
  userId: string;
  items: CartItem[];
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  orderId: string;
  userId: string;
  fullName: string;
  date: string;
  products: OrderItem[];
  total: number;
  status: string;
  phone?: string;
  email?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || '';

const apiFetch = (path: string, init?: RequestInit): Promise<Response> => {
  return fetch(`${API_BASE}${path}`, init);
};

const getHeaders = (contentTypeJson = true): HeadersInit => {
  const headers: Record<string, string> = {};
  if (contentTypeJson) {
    headers['Content-Type'] = 'application/json';
  }
  const token = localStorage.getItem('shoppyToken');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    let errorMessage = 'An error occurred';
    try {
      const errorData = await res.json();
      errorMessage =
        errorData.error?.message || errorData.message || errorMessage;
    } catch {
      // ignore
    }
    throw new Error(errorMessage);
  }
  if (res.status === 204) {
    return null;
  }
  return res.json();
};

export const api = {
  async getUser(userId: string): Promise<User> {
    const res = await apiFetch(`/users/${userId}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async updateUser(userId: string, body: Partial<User>): Promise<void> {
    const res = await apiFetch(`/users/${userId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  async getOrders(): Promise<Order[]> {
    const userId = localStorage.getItem('shoppyUserId');
    const permissions = (localStorage.getItem('shoppyPermission') || '').split(
      ',',
    );
    const url =
      permissions.includes('SuperAdminAccess') ||
      permissions.includes('AdministratorAccess') ||
      permissions.includes('SupportAccess')
        ? '/orders'
        : `/user-orders/${userId}/orders`;
    const res = await apiFetch(url, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async makeOrder(body: {
    fullName: string;
    phone?: string;
    email?: string;
    products: CartItem[];
    total: number;
  }): Promise<Order> {
    const userId = localStorage.getItem('shoppyUserId') || '';
    const res = await apiFetch(`/user-orders/${userId}/orders`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  async addToCart(body: {
    productId: string;
    quantity: number;
    name: string;
  }): Promise<void> {
    const userId = localStorage.getItem('shoppyUserId');
    const res = await apiFetch(`/shoppingCarts/${userId}/items`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  async deleteShoppingCart(): Promise<void> {
    const userId = localStorage.getItem('shoppyUserId');
    if (!userId) return;
    const res = await apiFetch(`/shoppingCarts/${userId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async getShoppingCartItems(): Promise<Cart | null> {
    const userId = localStorage.getItem('shoppyUserId');
    if (!userId) return null;
    const res = await apiFetch(`/shoppingCarts/${userId}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async updateCart(items: CartItem[]): Promise<void> {
    const userId = localStorage.getItem('shoppyUserId');
    if (!userId) return;
    const res = await apiFetch(`/shoppingCarts/${userId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({userId, items}),
    });
    return handleResponse(res);
  },

  async signUp(body: any): Promise<void> {
    const res = await apiFetch('/users/sign-up', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  async logIn(body: any): Promise<{token: string}> {
    const res = await apiFetch('/users/login', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  async logOut(): Promise<void> {
    const res = await apiFetch('/users/logout', {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async forgotPassword(body: any): Promise<{token: string}> {
    const res = await apiFetch('/users/forgot-password', {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  async passwordResetInit(body: {email: string}): Promise<any> {
    const res = await apiFetch('/users/reset-password/init', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  async passwordResetFinish(body: any): Promise<any> {
    const res = await apiFetch('/users/reset-password/finish', {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  async me(): Promise<User> {
    const res = await apiFetch('/users/me', {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async getProducts(options: {
    skip: number;
    limit: number;
    search?: string;
  }): Promise<Product[]> {
    const {skip, limit, search} = options;
    const filter: any = {skip, limit};
    if (search) {
      filter.where = {name: {like: `%${search}%`, options: 'i'}};
    }
    const res = await apiFetch(
      `/products?filter=${encodeURIComponent(JSON.stringify(filter))}`,
      {
        headers: getHeaders(),
      },
    );
    return handleResponse(res);
  },

  async getProductsCount(search?: string): Promise<{count: number}> {
    let url = '/products/count';
    if (search) {
      const where = {name: {like: `%${search}%`, options: 'i'}};
      url += `?where=${encodeURIComponent(JSON.stringify(where))}`;
    }
    const res = await apiFetch(url, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async getProduct(id: string): Promise<Product> {
    const res = await apiFetch(`/products/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async deleteProduct(id: string): Promise<void> {
    const res = await apiFetch(`/products/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async createProduct(product: Omit<Product, 'productId'>): Promise<Product> {
    const res = await apiFetch('/products', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(product),
    });
    return handleResponse(res);
  },

  async updateProduct(id: string, product: Partial<Product>): Promise<void> {
    const res = await apiFetch(`/products/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(product),
    });
    return handleResponse(res);
  },

  async getAdminProducts(options: {
    skip: number;
    limit: number;
  }): Promise<Product[]> {
    const filter = {skip: options.skip, limit: options.limit};
    const res = await apiFetch(
      `/admin/products?filter=${encodeURIComponent(JSON.stringify(filter))}`,
      {
        headers: getHeaders(),
      },
    );
    return handleResponse(res);
  },

  async getAdminProductsCount(): Promise<{count: number}> {
    const res = await apiFetch('/admin/products/count', {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async getAdminProductDashboard(): Promise<any> {
    const res = await apiFetch('/admin/products/dashboard', {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async toggleProductActive(id: string): Promise<{isActive: boolean}> {
    const res = await apiFetch(`/admin/products/${id}/toggle-active`, {
      method: 'PATCH',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async cancelOrder(orderId: string): Promise<void> {
    const userId = localStorage.getItem('shoppyUserId') || '';
    const res = await apiFetch(
      `/user-orders/${userId}/orders/${orderId}/cancel`,
      {
        method: 'PATCH',
        headers: getHeaders(),
      },
    );
    return handleResponse(res);
  },

  async getAdminOrders(
    status?: string,
    email?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<Order[]> {
    const body: any = {};
    if (status) body.status = status;
    if (email) body.email = email;
    if (startDate) body.startDate = startDate;
    if (endDate) body.endDate = endDate;

    const res = await apiFetch('/admin/orders', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    if (res.status === 204) return [];
    return handleResponse(res);
  },

  async getAdminDashboard(): Promise<any> {
    const res = await apiFetch('/admin/orders/dashboard', {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async updateAdminOrderStatus(orderId: string, status: string): Promise<void> {
    const res = await apiFetch(`/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({status}),
    });
    return handleResponse(res);
  },

  async checkProductHasOrders(
    productId: string,
  ): Promise<{hasOrders: boolean; count: number}> {
    const res = await apiFetch(`/admin/orders/check-product/${productId}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },
};
