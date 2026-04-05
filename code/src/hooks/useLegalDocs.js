import { useState, useEffect } from 'react';
import axios from 'axios';

let _cache = null;
let _promise = null;

export const useLegalDocs = () => {
    const [docs, setDocs] = useState(_cache || { termsUrl: '', privacyUrl: '', ofertaUrl: '' });
    const [loading, setLoading] = useState(!_cache);

    useEffect(() => {
        if (_cache) { setDocs(_cache); setLoading(false); return; }
        if (!_promise) {
            _promise = axios.get('/api/homepage/legal_docs')
                .then(res => {
                    _cache = res.data?.data || res.data || {};
                    return _cache;
                })
                .catch(() => ({ termsUrl: '', privacyUrl: '', ofertaUrl: '' }))
                .finally(() => { _promise = null; });
        }
        _promise.then(data => { setDocs(data); setLoading(false); });
    }, []);

    return { docs, loading };
};
