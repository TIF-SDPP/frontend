import { useState, useEffect } from "react";

export function useFetchGet(url) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const request = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    };

    setError(null);

    fetch(url, request)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => setData(data))
      .catch((error) => setError(error.message))
      .finally(() => setLoading(false));
  }, [url]);

  return { data, loading, error };
}

export function useFetchGetFile(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const request = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    };

    fetch(url, request)
      .then((response) => {
        const contentType = response.headers.get("Content-Type");

        if (contentType?.includes("application/json")) {
          return response.json();
        } else if (
          contentType?.includes("image/") ||
          contentType?.includes("video/") ||
          contentType?.includes("audio/")
        ) {
          return response.blob();
        } else {
          throw new Error("Tipo de contenido no soportado");
        }
      })
      .then((data) => {
        if (data instanceof Blob) {
          const fileUrl = URL.createObjectURL(data);
          setData({ fileUrl, contentType: data.type });
        } else {
          setData(data);
        }
      })
      .catch((error) => setError(error.message))
      .finally(() => setLoading(false));
  }, [url]);

  return { data, loading, error };
}

export async function fetchPost(url, data) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    return { status: true, data: responseData };
  } catch {
    return { status: false, data: null };
  }
}

export async function fetchPut(url, data) {
  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return { status: true };
  } catch {
    return { status: false };
  }
}

export async function fetchPutFile(url, data) {
  try {
    const response = await fetch(url, {
      method: "PUT",
      body: data,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    return { status: true, data: responseData };
  } catch {
    return { status: false, data: null };
  }
}

export async function fetchPostFile(url, data) {
  try {
    const response = await fetch(url, {
      method: "POST",
      body: data,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    return { status: true, data: responseData };
  } catch {
    return { status: false, data: null };
  }
}

export async function fetchDelete(url, data) {
  try {
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return { status: true };
  } catch {
    return { status: false };
  }
}

export async function useFetchUpdate(url, data) {
  try {
    const response = await fetch(url, {
      method: "UPDATE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return { status: true };
  } catch {
    return { status: false };
  }
}
