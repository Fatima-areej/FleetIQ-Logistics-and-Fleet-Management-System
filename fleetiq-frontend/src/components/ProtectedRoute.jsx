/*

Route Gaurd
Important frontend security component
allows us to protect certain routes and only allow access if the user is authenticated (and optionally has the right role).

In this code, we check if the user is logged in (by checking if user object exists) and if they have the required role (if allowedRoles is provided). 
If not authenticated or not authorized, we redirect them to the login page. 
Otherwise, we render the child components (the protected page).

*/

import { Navigate } from 'react-router-dom';            //Navigate is used to redirect users to another page
import { useAuth } from '../context/AuthContext';       //get authentication data from AuthContext, which provides user info and auth functions across the app

export default function ProtectedRoute({ children, allowedRoles }) {
    const { user } = useAuth();     //gets current logged-in user

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/login" replace />;
    }

    return children;
}