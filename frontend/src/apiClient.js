const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const buildQueryString = (query = {}) => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && `${value}`.trim() !== "") {
            params.append(key, value);
        }
    });

    const text = params.toString();
    return text ? `?${text}` : "";
};

const parseResponse = async (response) => {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
        return response.json();
    }

    const text = await response.text();
    return text ? { message: text } : {};
};

export const apiRequest = async (path, { method = "GET", token, body, query } = {}) => {
    const url = `${API_BASE_URL}${path}${buildQueryString(query)}`;

    const headers = {
        "Content-Type": "application/json"
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });

    const payload = await parseResponse(response);
    if (!response.ok) {
        const message = payload?.message || payload?.error || "Request failed.";
        const error = new Error(message);
        error.status = response.status;
        throw error;
    }

    return payload;
};
